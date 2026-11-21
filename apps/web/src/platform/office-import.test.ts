import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import { SHEET_MAX_BYTES, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";
import {
  CONVERSION_ATTR, convertFailureMessage, hasCfbMagic, isOfficeFile, isOfficeName, NOT_OFFICE_PAGE_MESSAGE, OFFICE_EXPORT_MESSAGE,
  OFFICE_EXTENSIONS, OFFICE_FAILED_MESSAGE, OFFICE_INSTALL_MESSAGE, OFFICE_MAX_BYTES, OFFICE_TIMEOUT_MESSAGE, OFFICE_TOO_BIG_MESSAGE,
  OFFICE_VALUES_MESSAGE, OfficeConvertError, officeHandler, officeMimeOf, officeStemOf, officeWebHandler, originalChangedMessage,
  withConversionMark,
} from "./office-import";

const PK = new Uint8Array([0x50, 0x4b, 3, 4, 7]);
const CFB = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const file = (name: string, path?: string, bytes: Uint8Array<ArrayBuffer> = PK): DroppedFile => ({
  name, size: bytes.byteLength, mime: "", ...(path === undefined ? {} : { path }), head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
});
function ctx() {
  const notify = vi.fn(async (_m: string) => undefined);
  const c: ImportContext = { blob: new Blob([PK]), head: PK, at: null, inserted: 0, target: null, notify, companions: [] };
  return { c, notify };
}
function sheetFake(out: ImportOutcome = "inserted") {
  const run = vi.fn(async (_f: DroppedFile, _c: ImportContext): Promise<ImportOutcome> => out);
  const h: ImportHandler = { id: "sheet", nature: "objet", detect: () => true, run };
  return { h, run };
}
const PDF = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])]);

describe("office-import (C16)", () => {
  it("libellés figés (HO1-6), plafond = celui du classeur, dix extensions (O1, O14)", () => {
    expect([OFFICE_EXPORT_MESSAGE, OFFICE_INSTALL_MESSAGE, OFFICE_TOO_BIG_MESSAGE, OFFICE_TIMEOUT_MESSAGE, OFFICE_FAILED_MESSAGE, OFFICE_VALUES_MESSAGE, NOT_OFFICE_PAGE_MESSAGE]).toEqual([
      "exportez en PDF depuis Office",
      "installez LibreOffice ou Microsoft Office",
      "fichier Office trop gros pour être converti",
      "conversion trop longue (plus de 120 s)",
      "la conversion en PDF a échoué",
      "importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages",
      "cette page ne vient pas d'un fichier Word, Excel ou PowerPoint",
    ]);
    expect(originalChangedMessage("cours.docx")).toBe("cours.docx a été modifié. Le réimporter dans un nouvel onglet ?");
    expect(OFFICE_MAX_BYTES).toBe(SHEET_MAX_BYTES);
    expect([...OFFICE_EXTENSIONS].sort()).toEqual([".doc", ".docx", ".odp", ".ods", ".odt", ".ppt", ".pptx", ".xls", ".xlsm", ".xlsx"]);
  });

  it("isOfficeFile : extension ET en-tête, casse ignorée (O2, Review Focus 1)", () => {
    expect(isOfficeFile(PK, "COURS.DOCX")).toBe(true);
    expect(isOfficeFile(PK, "diapos.pptx")).toBe(true);
    expect(isOfficeFile(CFB, "vieux.DOC")).toBe(true);
    expect(isOfficeFile(CFB, "cours.docx")).toBe(false);
    expect(isOfficeFile(PK, "vieux.xls")).toBe(false);
    expect(isOfficeFile(PK, "notes.txt")).toBe(false);
    expect(isOfficeFile(PK, ".docx")).toBe(false);
    expect(hasCfbMagic(CFB.subarray(0, 7))).toBe(false);
    expect([isOfficeName("a.ODP"), isOfficeName("a.pdf")]).toEqual([true, false]);
  });

  it("officeMimeOf et officeStemOf (O16)", () => {
    expect(officeMimeOf("cours.DOCX")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(officeMimeOf("diapos.pptx")).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(officeMimeOf("notes.xlsx")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(officeMimeOf("vieux.doc")).toBe("application/msword");
    expect(officeMimeOf("x.bin")).toBe("application/octet-stream");
    expect([officeStemOf("Cours 3.docx"), officeStemOf("notes.XLSM"), officeStemOf("sans extension")]).toEqual(["Cours 3", "notes", "sans extension"]);
  });

  it("office-web : message, « failed » ; .xlsx et .xlsm laissés au classeur (O3, S3)", async () => {
    const h = officeWebHandler();
    expect([h.id, h.nature]).toEqual(["office-web", "document"]);
    expect([h.detect(PK, "notes.xlsx"), h.detect(PK, "m.xlsm"), h.detect(CFB, "vieux.xls"), h.detect(PK, "cours.docx")]).toEqual([false, false, true, true]);
    const { c, notify } = ctx();
    expect(await h.run(file("cours.docx"), c)).toBe("failed");
    expect(notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_EXPORT_MESSAGE}`]]);
  });

  it("office (coque) : convert(path), puis open({ name, original : octets déposés, pdf }) → opened ; plafond de 100 Mio (S5, O14)", async () => {
    const convert = vi.fn(async (_p: string) => PDF);
    const open = vi.fn(async (_f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }) => true);
    const h = officeHandler({ convert, open });
    expect([h.id, h.nature, h.limit]).toEqual(["office", "document", { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE }]);
    expect(h.detect(PK, "notes.xlsx")).toBe(true);
    const { c } = ctx();
    expect(await h.run(file("cours.docx", "/home/u/cours.docx"), c)).toBe("opened");
    expect(convert.mock.calls).toEqual([["/home/u/cours.docx"]]);
    const arg = open.mock.calls[0]![0];
    expect([arg.name, arg.pdf]).toEqual(["cours.docx", PDF]);
    expect(arg.original).toBe(c.blob);
  });

  it("office : codes de la coque → messages ; une erreur sans code → échec générique (O14, Review Focus 2)", async () => {
    for (const [code, want] of [
      ["no-program", `cours.docx : ${OFFICE_INSTALL_MESSAGE}`],
      ["timeout", `cours.docx : ${OFFICE_TIMEOUT_MESSAGE}`],
      ["failed", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
      ["no-output", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
      ["io", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
    ] as const) {
      const open = vi.fn(async () => true);
      const h = officeHandler({ convert: async () => { throw new OfficeConvertError(code); }, open });
      const { c, notify } = ctx();
      expect(await h.run(file("cours.docx", "/x/cours.docx"), c), code).toBe("failed");
      expect(notify.mock.calls, code).toEqual([[want]]);
      expect(open).not.toHaveBeenCalled();
    }
    const h = officeHandler({ convert: async () => { throw new Error("réseau"); }, open: async () => true });
    const { c, notify } = ctx();
    await h.run(file("cours.docx", "/x/cours.docx"), c);
    expect(notify.mock.calls).toEqual([[`Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`]]);
    expect(convertFailureMessage("a.pptx", "timeout")).toBe(`a.pptx : ${OFFICE_TIMEOUT_MESSAGE}`);
  });

  it("office : .xlsx sans convertisseur (no-program) → classeur puis l'avis « importé en valeurs… » ; classeur en échec : aucun avis de plus (O4)", async () => {
    const sheet = sheetFake();
    const h = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: sheet.h });
    const { c, notify } = ctx();
    expect(await h.run(file("notes.xlsx", "/x/notes.xlsx"), c)).toBe("inserted");
    expect(sheet.run).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls).toEqual([[`notes.xlsx : ${OFFICE_VALUES_MESSAGE}`]]);
    const failing = sheetFake("failed");
    const h2 = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: failing.h });
    const second = ctx();
    expect(await h2.run(file("notes.xlsx", "/x/notes.xlsx"), second.c)).toBe("failed");
    expect(second.notify).not.toHaveBeenCalled();
  });

  it("office : .docx sans convertisseur → « installez… », jamais le classeur (O14)", async () => {
    const sheet = sheetFake();
    const h = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: sheet.h });
    const { c, notify } = ctx();
    expect(await h.run(file("cours.docx", "/x/cours.docx"), c)).toBe("failed");
    expect(sheet.run).not.toHaveBeenCalled();
    expect(notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_INSTALL_MESSAGE}`]]);
  });

  it("office : fichier sans chemin (collage) : .xlsx → classeur, .docx → « exportez en PDF depuis Office » ; convert jamais appelé (O14)", async () => {
    const convert = vi.fn(async () => PDF);
    const sheet = sheetFake();
    const h = officeHandler({ convert, open: async () => true, sheet: sheet.h });
    const a = ctx();
    expect(await h.run(file("notes.xlsx"), a.c)).toBe("inserted");
    const b = ctx();
    expect(await h.run(file("cours.docx"), b.c)).toBe("failed");
    expect(b.notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_EXPORT_MESSAGE}`]]);
    expect(convert).not.toHaveBeenCalled();
  });

  it("withConversionMark : data-conversion posé pendant, retiré après succès comme après échec, imbrications comptées (O25)", async () => {
    const attrs = new Map<string, string>();
    const root = { setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k) };
    const mark = withConversionMark(root);
    let during: string | undefined;
    expect(await mark(async () => { during = attrs.get(CONVERSION_ATTR); return 7; })).toBe(7);
    expect([during, attrs.has(CONVERSION_ATTR)]).toEqual(["en-cours", false]);
    await expect(mark(async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(attrs.has(CONVERSION_ATTR)).toBe(false);
    let release!: () => void;
    const slow = mark(() => new Promise<void>((r) => { release = r; }));
    await mark(async () => undefined);
    expect(attrs.get(CONVERSION_ATTR)).toBe("en-cours");
    release();
    await slow;
    expect(attrs.has(CONVERSION_ATTR)).toBe(false);
  });
});
