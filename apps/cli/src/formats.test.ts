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
    expect(rows).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: [] });
    expect(rows.find((r) => r.ext === ".rbitem")?.notes.join(" ")).toContain("state");
    expect(rows).toContainEqual(expect.objectContaining({ ext: ".rbitem", read: false, write: true, readLot: 2, writeLot: 1 }));
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
